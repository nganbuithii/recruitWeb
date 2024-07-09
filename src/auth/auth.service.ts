import { RegisterUserDto } from '@/users/dto/create-user.dto';
import { UsersService } from '@/users/users.service';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
// VALIDATE USER
export class AuthService {
    constructor(private usersService: UsersService,
        private jwtService: JwtService
    ) { }

    // user và pass là 2 tham số passport ném về
    async validateUser(username: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByUsername(username);
        // phải so sánh pass đã băm,
        if (user) {
            const isValid = this.usersService.checkUserPassword(pass, user.password)
            if (isValid == true) {
                return user;
            }
        }
        return null;
    }

    async login(user: any) {
        const { _id, name, email, role } = user;
        const payload = {
            sub: "token login",
            iss: "from server",
            _id,
            name,
            email,
            role
        };
        return {
            access_token: this.jwtService.sign(payload),
            user:
            {
                _id,
                name,
                email,
                role
            }
        };
    }

    async register(registerUserDto: RegisterUserDto) {
        try {
            const newUser = await this.usersService.register(registerUserDto);
            return {
                _id: newUser._id,
                createdDate: newUser.createdDate
            };
        } catch (error) {
            console.error("Error creating user:", error);
            throw new Error("Failed to create user.");
        }
    }
}
